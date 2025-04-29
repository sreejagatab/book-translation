import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Book, 
  Globe, 
  FileText, 
  Settings, 
  Download, 
  CheckCircle,
  List,
  Trash,
  Clock,
  AlertCircle 
} from 'lucide-react';
import { translationService, authService } from '../../services/api';
import FileUpload from '../common/FileUpload';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import TranslationList from '../common/TranslationList';

const Dashboard = () => {
  // State
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [translationService, setTranslationService] = useState('deepl');
  const [currentStep, setCurrentStep] = useState(1);
  const [translations, setTranslations] = useState([]);
  const [activeTranslation, setActiveTranslation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const navigate = useNavigate();

  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
  ];

  // Translation service options
  const services = [
    { id: 'deepl', name: 'DeepL Translator' },
    { id: 'microsoft', name: 'Microsoft Translator' },
    { id: 'amazon', name: 'Amazon Translate' },
    { id: 'argos', name: 'Argos Translate (Offline)' },
    { id: 'libre', name: 'LibreTranslate' },
  ];

  // Check authentication on component mount
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
    } else {
      loadTranslations();
    }
  }, [navigate]);

  // Load user translations
  const loadTranslations = async () => {
    try {
      setIsLoading(true);
      const data = await translationService.getUserTranslations();
      setTranslations(data);
      
      // Find any active translations
      const activeJobs = data.filter(t => t.status === 'processing');
      if (activeJobs.length > 0) {
        setActiveTranslation(activeJobs[0]);
        startPollingStatus(activeJobs[0].id);
      }
    } catch (error) {
      setError('Failed to load translations');
      console.error('Error loading translations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for translation status updates
  const startPollingStatus = (translationId) => {
    const interval = setInterval(async () => {
      try {
        const data = await translationService.getTranslationStatus(translationId);
        
        // Update active translation
        setActiveTranslation(data);
        
        // Update in translations list
        setTranslations(prev => 
          prev.map(t => t.id === translationId ? data : t)
        );
        
        // Stop polling when complete
        if (data.status !== 'processing') {
          clearInterval(interval);
          
          // If on step 3, update UI to show completion
          if (currentStep === 3) {
            setCurrentStep(4);
          }
        }
      } catch (error) {
        console.error('Error polling translation status:', error);
        clearInterval(interval);
      }
    }, 3000);
    
    // Cleanup on component unmount
    return () => clearInterval(interval);
  };

  // Handle file upload
  const handleFileChange = (file) => {
    if (file) {
      setFile(file);
      setFileName(file.name);
      setCurrentStep(2);
    }
  };

  // Start translation process
  const handleStartTranslation = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguage', targetLanguage);
      formData.append('service', translationService);
      
      // Start translation
      const response = await translationService.startTranslation(formData);
      
      // Update state with new translation
      const newTranslation = {
        id: response.job.id,
        fileName: response.job.fileName,
        sourceLanguage: response.job.sourceLanguage,
        targetLanguage: response.job.targetLanguage,
        service: response.job.service,
        status: response.job.status,
        progress: 0,
        createdAt: new Date().toISOString()
      };
      
      setActiveTranslation(newTranslation);
      setTranslations(prev => [newTranslation, ...prev]);
      
      // Move to step 3
      setCurrentStep(3);
      
      // Start polling for status updates
      startPollingStatus(newTranslation.id);
    } catch (error) {
      console.error('Error starting translation:', error);
      setError('Failed to start translation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel translation
  const handleCancelTranslation = async (id) => {
    try {
      await translationService.cancelTranslation(id);
      
      // Update translations list
      setTranslations(prev => 
        prev.map(t => t.id === id ? { ...t, status: 'canceled' } : t)
      );
      
      // If canceling active translation
      if (activeTranslation && activeTranslation.id === id) {
        setActiveTranslation(prev => ({ ...prev, status: 'canceled' }));
      }
    } catch (error) {
      console.error('Error canceling translation:', error);
      setError('Failed to cancel translation.');
    }
  };

  // Delete translation
  const handleDeleteTranslation = async (id) => {
    try {
      await translationService.deleteTranslation(id);
      
      // Remove from translations list
      setTranslations(prev => prev.filter(t => t.id !== id));
      
      // If deleting active translation
      if (activeTranslation && activeTranslation.id === id) {
        setActiveTranslation(null);
      }
    } catch (error) {
      console.error('Error deleting translation:', error);
      setError('Failed to delete translation.');
    }
  };

  // Download translated file
  const handleDownload = (id) => {
    window.open(translationService.getDownloadUrl(id), '_blank');
  };

  // Reset the process to start a new translation
  const resetDashboard = () => {
    setFile(null);
    setFileName('');
    setCurrentStep(1);
    setActiveTranslation(null);
  };

  // Toggle between translation process and history view
  const toggleView = () => {
    setShowHistory(!showHistory);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book size={24} />
            <h1 className="text-xl font-bold">Book Translation Dashboard</h1>
          </div>
          <div>
            <button 
              onClick={toggleView}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-700 rounded hover:bg-blue-800 transition"
            >
              {showHistory ? (
                <>
                  <Upload size={18} />
                  <span>New Translation</span>
                </>
              ) : (
                <>
                  <List size={18} />
                  <span>History</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-6">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start">
            <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {showHistory ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Translation History</h2>
            <TranslationList 
              translations={translations}
              onDelete={handleDeleteTranslation}
              onCancel={handleCancelTranslation}
              onDownload={handleDownload}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                    <Upload size={20} />
                  </div>
                  <span className="mt-2 text-sm">Upload</span>
                </div>
                <div className="flex-grow mx-4 h-1 bg-gray-200 relative">
                  <div 
                    className="absolute top-0 left-0 h-1 bg-blue-600" 
                    style={{ width: `${currentStep > 1 ? 100 : 0}%` }}
                  ></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                    <Settings size={20} />
                  </div>
                  <span className="mt-2 text-sm">Configure</span>
                </div>
                <div className="flex-grow mx-4 h-1 bg-gray-200 relative">
                  <div 
                    className="absolute top-0 left-0 h-1 bg-blue-600" 
                    style={{ width: `${currentStep > 2 ? 100 : 0}%` }}
                  ></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                    <Globe size={20} />
                  </div>
                  <span className="mt-2 text-sm">Translate</span>
                </div>
                <div className="flex-grow mx-4 h-1 bg-gray-200 relative">
                  <div 
                    className="absolute top-0 left-0 h-1 bg-blue-600" 
                    style={{ width: `${currentStep > 3 ? 100 : 0}%` }}
                  ></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 4 ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                    <Download size={20} />
                  </div>
                  <span className="mt-2 text-sm">Download</span>
                </div>
              </div>
            </div>

            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Upload Your Book</h2>
                <p className="mb-4 text-gray-600">Supported formats: PDF, EPUB, TXT, DOCX</p>
                
                <FileUpload 
                  onFileSelect={handleFileChange}
                  acceptedFormats=".pdf,.epub,.txt,.docx"
                  maxSize={100 * 1024 * 1024} // 100MB
                />
              </div>
            )}

            {/* Step 2: Configure */}
            {currentStep === 2 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Configure Translation</h2>
                
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <FileText size={20} className="mr-2 text-blue-500" />
                    <span>Selected file: <strong>{fileName}</strong></span>
                  </div>
                  <button 
                    onClick={() => setCurrentStep(1)} 
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Change file
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 font-medium">Source Language</label>
                    <select
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {languages.map((lang) => (
                        <option key={`source-${lang.code}`} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-medium">Target Language</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {languages.map((lang) => (
                        <option key={`target-${lang.code}`} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block mb-2 font-medium">Translation Service</label>
                  <select
                    value={translationService}
                    onChange={(e) => setTranslationService(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleStartTranslation}
                    disabled={isLoading}
                    isLoading={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Start Translation
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Translate */}
            {currentStep === 3 && activeTranslation && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">
                  Translation in Progress
                </h2>
                
                <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Source Language</p>
                      <p className="font-medium">{languages.find(l => l.code === activeTranslation.sourceLanguage)?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Target Language</p>
                      <p className="font-medium">{languages.find(l => l.code === activeTranslation.targetLanguage)?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">File</p>
                      <p className="font-medium">{activeTranslation.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Translation Service</p>
                      <p className="font-medium">{services.find(s => s.id === activeTranslation.service)?.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Translation progress</span>
                    <span className="text-sm font-medium">{activeTranslation.progress || 0}%</span>
                  </div>
                  <ProgressBar progress={activeTranslation.progress || 0} />
                  
                  <div className="mt-4 text-sm text-gray-600 flex items-center">
                    <Clock size={16} className="mr-2" />
                    <p>Processing pages... This may take a few minutes depending on file size.</p>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={() => handleCancelTranslation(activeTranslation.id)}
                    variant="outline"
                    className="px-6 py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 transition"
                  >
                    Cancel Translation
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Download */}
            {currentStep === 4 && activeTranslation && activeTranslation.status === 'completed' && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center">
                  <div className="mb-6 flex justify-center">
                    <CheckCircle size={64} className="text-green-500" />
                  </div>
                  
                  <h2 className="text-2xl font-semibold mb-4">Translation Complete!</h2>
                  <p className="mb-6 text-gray-600">Your book has been successfully translated from {languages.find(l => l.code === activeTranslation.sourceLanguage)?.name} to {languages.find(l => l.code === activeTranslation.targetLanguage)?.name}.</p>
                  
                  <div className="mb-8">
                    <Button
                      onClick={() => handleDownload(activeTranslation.id)}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center mx-auto"
                    >
                      <Download size={20} className="mr-2" />
                      Download Translated Book
                    </Button>
                  </div>
                  
                  <button 
                    onClick={resetDashboard}
                    className="text-blue-600 hover:underline"
                  >
                    Translate another book
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-4 border-t">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>Book Translation Dashboard • Powered by Open Source Translation Tools</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;