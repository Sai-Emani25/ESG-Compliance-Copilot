/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Upload, FileText, Loader2, Leaf } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setReport(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setReport(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze-invoice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      setReport(data.audit_report);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4">
          <div className="bg-emerald-100 p-4 rounded-full text-emerald-700">
            <Leaf className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-800">
            Autonomous ESG & Carbon Compliance Copilot
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Upload ERP logs, utility bills, or travel manifests for audit-ready CSRD and SEC disclosure processing.
          </p>
        </header>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            
            <label 
              htmlFor="file-upload" 
              className="w-full max-w-lg cursor-pointer group"
            >
              <div className="border-2 border-dashed border-slate-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-colors rounded-xl p-10 flex flex-col items-center justify-center space-y-3">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                <div className="text-center">
                  <span className="text-sm font-medium text-emerald-600 group-hover:text-emerald-700">Click to upload</span>
                  <span className="text-sm text-slate-500"> or drag and drop</span>
                </div>
                <p className="text-xs text-slate-400">PDF documents only</p>
              </div>
              <input 
                id="file-upload" 
                name="file-upload" 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>

            {file && (
              <div className="flex items-center space-x-3 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200 w-full max-w-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full max-w-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing scopes & running math...</span>
                </>
              ) : (
                <span>Generate CSRD Disclosure</span>
              )}
            </button>

            {error && (
              <div className="w-full max-w-lg bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Report Section */}
        {report && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
            <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-semibold text-emerald-900">Audit-Ready Disclosure</h2>
            </div>
            <div className="p-8 prose prose-slate prose-emerald max-w-none">
              <div className="markdown-body">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
