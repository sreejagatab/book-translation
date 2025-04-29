import React, { useState } from 'react';
import { Upload, Book, Globe, FileText, Settings, Download, CheckCircle } from 'lucide-react';

const TranslationDashboard = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [translationService, setTranslationService] = useState('deepl');
  const [translationProgress, setTranslationProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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

  const services = [
    { id: 'deepl', name: 'DeepL Translator' },
    { id: 'microsoft', name: 'Microsoft Translator' },
    { id: 'amazon', name: 'Amazon Translate' },
    { id: 'argos', name: 'Argos Translate (Offline)' },
    { id: 'libre', name: 'LibreTranslate' },
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setCurrentStep(2);
    }
  };

  const handleStartTranslation = () => {
    setIsTranslating(true);
    
    // Simulate translation progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setTranslationProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsTranslating(false);
        setIsDone(true);
      }
    }, 500);
  };

  const resetDashboard = () => {
    setFile(null);
    setFileName('');
    setTranslationProgress(0);
    setIsTranslating(false);
    setIsDone(false);
    setCurrentStep(1);
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-6">
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
                style={{ width: `${isDone ? 100 : 0}%` }}
              ></div>
            </div>
            <div className={`flex flex-col items-center ${isDone ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isDone ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
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
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.epub,.txt,.docx"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="file-upload" 
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload size={48} className="text-blue-500 mb-4" />
                <p className="mb-2 font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">PDF, EPUB, TXT or DOCX (max 100MB)</p>
              </label>
            </div>
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
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Translate */}
        {currentStep === 3 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              {isDone ? "Translation Complete!" : "Start Translation"}
            </h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Source Language</p>
                  <p className="font-medium">{languages.find(l => l.code === sourceLanguage)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Language</p>
                  <p className="font-medium">{languages.find(l => l.code === targetLanguage)?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">File</p>
                  <p className="font-medium">{fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Translation Service</p>
                  <p className="font-medium">{services.find(s => s.id === translationService)?.name}</p>
                </div>
              </div>
            </div>
            
            {!isTranslating && !isDone && (
              <div className="mb-8 text-center">
                <button
                  onClick={handleStartTranslation}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Start Translation
                </button>
              </div>
            )}
            
            {(isTranslating || isDone) && (
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Translation progress</span>
                  <span className="text-sm font-medium">{translationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${translationProgress}%` }}
                  ></div>
                </div>
                
                {isTranslating && (
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Processing pages... This may take a few minutes.</p>
                  </div>
                )}
              </div>
            )}
            
            {isDone && (
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <CheckCircle size={64} className="text-green-500" />
                </div>
                
                <p className="mb-6 text-lg">Your book has been successfully translated!</p>
                
                <div className="mb-8">
                  <button className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center mx-auto">
                    <Download size={20} className="mr-2" />
                    Download Translated Book
                  </button>
                </div>
                
                <button 
                  onClick={resetDashboard}
                  className="text-blue-600 hover:underline"
                >
                  Translate another book
                </button>
              </div>
            )}
          </div>
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

export default TranslationDashboard;