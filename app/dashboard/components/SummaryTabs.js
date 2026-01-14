"use client";
import React, { useState } from 'react';
import ClinicalSummary from './ClinicalSummary';
import DischargeSummary from './DischargeSummary';

export default function SummaryTabs({ 
  sections, 
  setSections, 
  saveSectionToDB, 
  transcript,
  dischargeSections,
  setDischargeSections,
  saveDischargeSection,
  activeTab = 'clinical',
  setActiveTab
}) {

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('clinical')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'clinical'
                ? 'text-gray-800 border-b-2 border-gray-800 bg-gray-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Clinical Summary
          </button>
          <button
            onClick={() => setActiveTab('discharge')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'discharge'
                ? 'text-gray-800 border-b-2 border-gray-800 bg-gray-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Discharge Summary
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'clinical' ? (
          <ClinicalSummary
            sections={sections}
            setSections={setSections}
            saveSectionToDB={saveSectionToDB}
            transcript={transcript}
          />
        ) : (
          <DischargeSummary
            sections={dischargeSections}
            setSections={setDischargeSections}
            saveSectionToDB={saveDischargeSection}
            transcript={transcript}
          />
        )}
      </div>
    </div>
  );
}
