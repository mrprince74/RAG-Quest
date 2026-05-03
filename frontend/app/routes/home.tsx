import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import { Upload, FileText, Send, Bot, User, File, CheckCircle2, Loader2, AlertCircle, Library, X, ChevronLeft, Database } from "lucide-react";
import axios from "axios";

export function meta() {
  return [
    { title: "RAG Quest" },
    { name: "description", content: "Chat with your documents!" },
  ];
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: any[];
}

interface SystemDoc {
  title: string;
  document_id: string;
  file_type: string;
  total_pages: number | null;
  file_size_bytes: number;
}

interface SystemDocDetails {
  filename: string;
  file_type: string;
  file_hash: string;
  file_size_bytes: number;
  total_pages?: number;
  ingested_at: string;
  total_chunks: number;
  chunks: {
    chunk_id: string;
    text: string;
    page?: number;
  }[];
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "ai", content: "Hello! Upload some documents and ask me anything about them." }
  ]);
  const [query, setQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [systemDocs, setSystemDocs] = useState<SystemDoc[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  const [selectedDocDetails, setSelectedDocDetails] = useState<SystemDocDetails | null>(null);
  const [isLoadingDocDetails, setIsLoadingDocDetails] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.name.endsWith('.pdf') || file.name.endsWith('.txt') || file.name.endsWith('.md')
      );
      setFiles(droppedFiles);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploadStatus("uploading");
    setUploadError("");
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
      await axios.post("/api/ingest/files", formData);

      setUploadStatus("success");
      setTimeout(() => {
        setFiles([]);
        setUploadStatus("idle");
      }, 3000);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadError(err.response?.data?.detail || err.message || "An unexpected error occurred.");
    }
  };

  const handleQuery = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isQuerying) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsQuerying(true);

    try {
      const response = await axios.post("/api/ai/query", { question: userMessage.content });
      const data = response.data;
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.answer,
        sources: data.sources
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I encountered an error while trying to answer your question."
      }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const fetchDocDetails = async (docId: string) => {
    setIsLoadingDocDetails(true);
    try {
      const response = await axios.get(`/api/docs/${docId}`);
      setSelectedDocDetails(response.data);
    } catch (err) {
      console.error("Failed to fetch document details", err);
    } finally {
      setIsLoadingDocDetails(false);
    }
  };

  const fetchSystemDocs = async () => {
    setIsLoadingDocs(true);
    setShowDocsModal(true);
    try {
      const response = await axios.get("/api/docs");
      setSystemDocs(response.data.documents || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-violet-500/30 flex p-6 gap-6">
      {/* Sidebar - Document Management */}
      <div className="w-1/3 flex flex-col gap-6 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-violet-500/10 rounded-xl">
            <FileText className="text-violet-400 w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Documents</h2>
            <p className="text-sm text-zinc-400">Upload context for the AI</p>
          </div>
        </div>

        {/* Dropzone */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative group flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer"
        >
          <input 
            type="file" 
            multiple 
            accept=".pdf,.txt,.md"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="bg-zinc-800 p-4 rounded-full mb-4 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-300">
            <Upload className="w-6 h-6 text-zinc-400 group-hover:text-violet-400" />
          </div>
          <p className="font-medium text-zinc-300">Drop files or click to upload</p>
          <p className="text-xs text-zinc-500 mt-2">Supports .pdf, .txt, .md</p>
        </div>

        {/* File List & Upload Button */}
        {files.length > 0 && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-zinc-400">{files.length} file(s) selected</span>
              <button 
                onClick={() => setFiles([])}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear all
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <File className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <span className="text-sm truncate text-zinc-300">{file.name}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploadStatus === "uploading"}
              className="mt-2 w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadStatus === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus === "success" && (
          <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">Files uploaded and processed successfully!</p>
          </div>
        )}
        
        {uploadStatus === "error" && (
          <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{uploadError}</p>
          </div>
        )}

        <button
          onClick={fetchSystemDocs}
          className="mt-auto w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-zinc-700 shadow-lg"
        >
          <Library className="w-4 h-4" />
          View System Documents
        </button>
      </div>

      {/* Main Area - Chat Interface */}
      <div className="w-2/3 flex flex-col bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-zinc-900 to-transparent z-10 pointer-events-none"></div>
        
        {/* Chat Header */}
        <div className="px-8 py-6 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md z-20 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent inline-block">
              Document Q&A
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Ask questions about your uploaded documents</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 relative z-0 custom-scrollbar pb-32">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                msg.role === "user" ? "bg-violet-600 shadow-violet-600/20" : "bg-zinc-800 border border-zinc-700"
              }`}>
                {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-violet-400" />}
              </div>
              
              <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-6 py-4 rounded-2xl ${
                  msg.role === "user" 
                    ? "bg-violet-600 text-white rounded-tr-sm" 
                    : "bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 rounded-tl-sm shadow-xl"
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-500 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800 w-full max-w-sm">
                    <p className="font-semibold mb-1 text-zinc-400">Sources Context:</p>
                    <ul className="list-disc list-inside flex flex-col gap-1">
                      {msg.sources.map((source, idx) => (
                        <li key={idx} className="truncate">
                          {source.filename || "Unknown Document"} {source.page !== undefined ? `(Page ${source.page + 1})` : ""} {source.confidence !== undefined ? `- ${Math.round(source.confidence * 100)}% Match` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isQuerying && (
            <div className="flex gap-4 self-start max-w-[80%] animate-pulse">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-800 border border-zinc-700 shadow-lg">
                <Bot className="w-5 h-5 text-violet-400" />
              </div>
              <div className="px-6 py-4 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 rounded-tl-sm flex items-center gap-2 shadow-xl">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span className="text-zinc-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-zinc-900/80 border-t border-zinc-800/50 backdrop-blur-xl z-20">
          <form onSubmit={handleQuery} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-6 pr-16 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all shadow-inner"
              disabled={isQuerying}
            />
            <button
              type="submit"
              disabled={!query.trim() || isQuerying}
              className="absolute right-3 p-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600 shadow-lg shadow-violet-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-xs text-zinc-600 mt-4">
            AI can make mistakes. Verify important information from the uploaded documents.
          </p>
        </div>
      </div>
      
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                {selectedDocDetails ? (
                  <button 
                    onClick={() => setSelectedDocDetails(null)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                ) : (
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Library className="text-violet-400 w-5 h-5" />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white">
                  {selectedDocDetails ? "Document Details" : "System Documents"}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setShowDocsModal(false);
                  setSelectedDocDetails(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLoadingDocs ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <p>Loading documents...</p>
                </div>
              ) : systemDocs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No documents found in the system.</p>
                </div>
              ) : selectedDocDetails || isLoadingDocDetails ? (
                isLoadingDocDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    <p>Loading document details...</p>
                  </div>
                ) : selectedDocDetails && (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-col gap-2 bg-zinc-800/30 p-5 rounded-2xl border border-zinc-700/50">
                      <h3 className="text-lg font-semibold text-white mb-2">{selectedDocDetails.filename}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                        <div><span className="text-zinc-500 block text-xs">Type</span>{selectedDocDetails.file_type}</div>
                        <div><span className="text-zinc-500 block text-xs">Size</span>{(selectedDocDetails.file_size_bytes / 1024).toFixed(1)} KB</div>
                        {selectedDocDetails.total_pages && <div><span className="text-zinc-500 block text-xs">Pages</span>{selectedDocDetails.total_pages}</div>}
                        <div><span className="text-zinc-500 block text-xs">Ingested</span>{new Date(selectedDocDetails.ingested_at).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-violet-400" />
                        <h4 className="font-medium text-zinc-200">Vector Chunks ({selectedDocDetails.total_chunks})</h4>
                      </div>
                      <div className="flex flex-col gap-3">
                        {selectedDocDetails.chunks.map((chunk, idx) => (
                          <div key={idx} className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              {/* <span className="text-xs font-mono text-zinc-500 truncate mr-4">ID: {chunk.chunk_id}</span> */}
                              {chunk.page !== undefined && <span className="text-xs text-violet-400 font-medium bg-violet-500/10 px-2 py-0.5 rounded">Page {chunk.page + 1}</span>}
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{chunk.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  {systemDocs.map((doc, i) => (
                    <div 
                      key={i} 
                      onClick={() => fetchDocDetails(doc.document_id)}
                      className="flex flex-col p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-violet-500/50 hover:bg-zinc-800 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                          <span className="font-medium text-zinc-200 group-hover:text-white transition-colors">{doc.title}</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 group-hover:border-violet-500/30 transition-colors">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-zinc-400 mt-1 pl-6">
                        <span>Type: {doc.file_type}</span>
                        {doc.total_pages && <span>Pages: {doc.total_pages}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
