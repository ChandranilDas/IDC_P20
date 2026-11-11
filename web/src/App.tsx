import React, { useState } from 'react';
import { SimulationLab } from './views/SimulationLab';
import { SavedResultsView } from './views/SavedResultsView';
import { ValidationView } from './views/ValidationView';
import { AboutView } from './views/AboutView';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lab' | 'saved' | 'validation' | 'about'>('lab');

  return (
    <div className="app-container">
      {/* Light, compact editorial header */}
      <header className="app-header">
        <div className="brand-section">
          <span className="brand-wordmark">P20 / TDGL</span>
          <span className="brand-desc">Time-Dependent Ginzburg–Landau · Model-A Laboratory</span>
        </div>

        {/* Clean plain-text navigation tabs with underline active state */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab ${activeTab === 'lab' ? 'active' : ''}`}
            onClick={() => setActiveTab('lab')}
          >
            Simulation Lab
          </button>
          <button
            className={`nav-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved Results
          </button>
          <button
            className={`nav-tab ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
          >
            Validation
          </button>
          <button
            className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </nav>
      </header>

      {/* Main Content View with Recoverable Error Boundary */}
      <main className="app-main">
        <ErrorBoundary fallbackTitle="View Rendering Error">
          {activeTab === 'lab' && <SimulationLab />}
          {activeTab === 'saved' && <SavedResultsView />}
          {activeTab === 'validation' && <ValidationView />}
          {activeTab === 'about' && <AboutView />}
        </ErrorBoundary>
      </main>

      {/* Quiet, scholarly footer */}
      <footer className="app-footer">
        <div>
          Based on Verma et al., <em>Phys. Rev. E</em> 107, 034207 (2023) & Yadav et al., <em>Phys. Rev. E</em> 110, 044130 (2024).
        </div>
        <div>
          Nonconserved Real Scalar Order Parameter (Model A) · Academic Research Project P20
        </div>
      </footer>
    </div>
  );
};

export default App;
