import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, FileText, Image as ImageIcon, Sparkles, Loader2, 
  X, Copy, Check, Clock, ChevronDown, ChevronUp, Trash2 
} from 'lucide-react';
import './App.css';

function App() {
  // --- STATE ---
  const [inputText, setInputText] = useState('');
  const [files, setFiles] = useState([]);
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false); // Mobile toggle

  // --- LOAD HISTORY ON START ---
  useEffect(() => {
    const saved = localStorage.getItem('promptHistory');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // --- HANDLERS ---
  
  // Add files (append to existing)
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Filter duplicates by name to be safe
      setFiles((prev) => [...prev, ...newFiles.filter(nf => !prev.some(pf => pf.name === nf.name))]);
    }
  };

  // Remove a specific file
  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(refinedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Restore a history item
  const loadHistoryItem = (item) => {
    setInputText(item.original);
    setRefinedPrompt(item.result);
    setExpandedOutput(false);
  };

  // Clear all history
  const clearHistory = () => {
    if(confirm("Clear all history?")) {
        setHistory([]);
        localStorage.removeItem('promptHistory');
    }
  }

  // Submit to Backend
  const handleSubmit = async () => {
    if (!inputText && files.length === 0) return;

    setLoading(true);
    setExpandedOutput(false); // Reset view
    const formData = new FormData();
    formData.append('user_prompt', inputText);
    
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await axios.post('http://localhost:8000/refine-prompt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const result = response.data.refined_prompt || response.data.error;
      setRefinedPrompt(result);

      // Save to History (if successful)
      if (!response.data.error) {
        const newItem = { 
            id: Date.now(), 
            date: new Date().toLocaleDateString(),
            original: inputText, 
            result: result 
        };
        const newHistory = [newItem, ...history].slice(0, 10); // Keep last 10
        setHistory(newHistory);
        localStorage.setItem('promptHistory', JSON.stringify(newHistory));
      }

    } catch (error) {
      console.error("Error:", error);
      setRefinedPrompt("Network Error: Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* SIDEBAR (History) */}
      <aside className={`sidebar ${showHistory ? 'open' : ''}`}>
        <div className="sidebar-header">
            <h3><Clock size={18}/> History</h3>
            <button className="icon-btn" onClick={clearHistory} title="Clear History">
                <Trash2 size={16} />
            </button>
        </div>
        <div className="history-list">
            {history.length === 0 && <p className="empty-msg">No recent prompts</p>}
            {history.map(item => (
                <div key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}>
                    <div className="history-date">{item.date}</div>
                    <div className="history-preview">
                        {item.original.substring(0, 40) || "Image/PDF Input"}...
                    </div>
                </div>
            ))}
        </div>
        {/* Mobile Close Button */}
        <button className="mobile-close-btn" onClick={() => setShowHistory(false)}>Close</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-bar">
          <button className="menu-btn" onClick={() => setShowHistory(!showHistory)}>
            <Clock />
          </button>
          <div>
            <h1>Prompt Refiner AI</h1>
            <p>Upload context, get the perfect prompt.</p>
          </div>
        </header>

        <div className="grid-layout">
          
          {/* LEFT: INPUT */}
          <div className="card input-card">
            <h2><FileText className="icon-blue"/> Input Context</h2>
            
            <textarea
              placeholder="Describe what you want... (e.g. 'Analyze this PDF and write a summary')"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {/* File Upload Area */}
            <div className="file-area">
                <label className="file-upload-btn">
                    <Upload size={16} /> Add PDF/Image
                    <input type="file" hidden multiple onChange={handleFileChange} />
                </label>
                
                <div className="file-chips">
                    {files.map((f, i) => (
                        <div key={i} className="chip">
                            {f.type.includes('image') ? <ImageIcon size={12}/> : <FileText size={12}/>}
                            <span className="file-name">{f.name}</span>
                            <button onClick={() => removeFile(i)} className="remove-file"><X size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <button className="primary-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 className="spin" /> Refining...</> : <><Sparkles /> Generate Perfect Prompt</>}
            </button>
          </div>

          {/* RIGHT: OUTPUT */}
          <div className="card output-card">
            <div className="card-header">
                <h2><Sparkles className="icon-purple"/> Result</h2>
                {refinedPrompt && (
                    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? " Copied!" : " Copy"}
                    </button>
                )}
            </div>

            <div className={`output-content ${expandedOutput ? 'expanded' : 'collapsed'}`}>
                {refinedPrompt || <span className="placeholder-text">Your optimized prompt will appear here...</span>}
            </div>

            {refinedPrompt && refinedPrompt.length > 300 && (
                <button className="toggle-view-btn" onClick={() => setExpandedOutput(!expandedOutput)}>
                    {expandedOutput ? <><ChevronUp size={16}/> Show Less</> : <><ChevronDown size={16}/> Show Full Prompt</>}
                </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;