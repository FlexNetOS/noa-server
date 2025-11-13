/**
 * Model Selector Component
 * UI for selecting and switching between AI models
 */

import React, { useState, useEffect } from 'react';
import { AIModel } from '../../services/aiProvider';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: AIModel | null;
  onModelChange: (model: AIModel) => void;
  isLoading?: boolean;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  isLoading = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('all');

  const providers = Array.from(new Set(models.map((m) => m.provider)));
  const filteredModels =
    filterProvider === 'all'
      ? models
      : models.filter((m) => m.provider === filterProvider);

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'claude':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'llama.cpp':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      case 'llama.cpp':
        return '🦙';
      default:
        return '⚡';
    }
  };

  const handleModelSelect = (model: AIModel) => {
    onModelChange(model);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Model Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select AI model"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {selectedModel ? (
            <>
              <span className="text-2xl" aria-hidden="true">
                {getProviderIcon(selectedModel.provider)}
              </span>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {selectedModel.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedModel.provider} • {selectedModel.contextLength.toLocaleString()} tokens
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Select a model...</div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown Content */}
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Provider Filter */}
            {providers.length > 1 && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-1" role="tablist">
                  <button
                    onClick={() => setFilterProvider('all')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filterProvider === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    role="tab"
                    aria-selected={filterProvider === 'all'}
                  >
                    All
                  </button>
                  {providers.map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setFilterProvider(provider)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        filterProvider === provider
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      role="tab"
                      aria-selected={filterProvider === provider}
                    >
                      {getProviderIcon(provider)} {provider}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Model List */}
            <div className="max-h-80 overflow-y-auto" role="listbox">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No models available
                </div>
              ) : (
                filteredModels.map((model) => (
                  <button
                    key={`${model.provider}-${model.id}`}
                    onClick={() => handleModelSelect(model)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      selectedModel?.id === model.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                    role="option"
                    aria-selected={selectedModel?.id === model.id}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl mt-1" aria-hidden="true">
                        {getProviderIcon(model.provider)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${getProviderColor(
                              model.provider
                            )}`}
                          >
                            {model.provider}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Context: {model.contextLength.toLocaleString()} tokens
                        </div>
                        {model.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                            {model.description}
                          </div>
                        )}
                      </div>
                      {selectedModel?.id === model.id && (
                        <svg
                          className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
