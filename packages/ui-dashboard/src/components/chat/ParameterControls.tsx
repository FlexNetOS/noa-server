/**
 * Parameter Controls Component
 * UI for configuring AI model parameters (temperature, max_tokens, etc.)
 */

import React, { useState, useEffect } from 'react';
import { ChatCompletionConfig } from '../../services/aiProvider';

interface ParameterControlsProps {
  config: ChatCompletionConfig;
  onChange: (config: ChatCompletionConfig) => void;
  disabled?: boolean;
  className?: string;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  config,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [localConfig, setLocalConfig] = useState<ChatCompletionConfig>(config);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key: keyof ChatCompletionConfig, value: number | string[] | undefined) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    onChange(updated);
  };

  const handleStopSequenceAdd = () => {
    const current = localConfig.stop || [];
    handleChange('stop', [...current, '']);
  };

  const handleStopSequenceChange = (index: number, value: string) => {
    const current = localConfig.stop || [];
    const updated = [...current];
    updated[index] = value;
    handleChange('stop', updated);
  };

  const handleStopSequenceRemove = (index: number) => {
    const current = localConfig.stop || [];
    const updated = current.filter((_, i) => i !== index);
    handleChange('stop', updated.length > 0 ? updated : undefined);
  };

  const resetToDefaults = () => {
    const defaults: ChatCompletionConfig = {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 1.0,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: undefined,
    };
    setLocalConfig(defaults);
    onChange(defaults);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
        aria-expanded={isExpanded}
        aria-label="Toggle parameter controls"
      >
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <span className="font-medium text-gray-900 dark:text-white">Model Parameters</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Controls */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-6 border-t border-gray-200 dark:border-gray-700">
          {/* Temperature */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {localConfig.temperature?.toFixed(2) || '0.70'}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={localConfig.temperature || 0.7}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 disabled:opacity-50"
              aria-label="Temperature"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controls randomness: Lower is more focused, higher is more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Tokens
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {localConfig.max_tokens || 2000}
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="4096"
              step="1"
              value={localConfig.max_tokens || 2000}
              onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 disabled:opacity-50"
              aria-label="Maximum tokens"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum length of generated response
            </p>
          </div>

          {/* Top P */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Top P</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {localConfig.top_p?.toFixed(2) || '1.00'}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localConfig.top_p || 1.0}
              onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 disabled:opacity-50"
              aria-label="Top P"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Nucleus sampling: Consider tokens with top_p probability mass
            </p>
          </div>

          {/* Frequency Penalty */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Frequency Penalty
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {localConfig.frequency_penalty?.toFixed(2) || '0.00'}
              </span>
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.01"
              value={localConfig.frequency_penalty || 0}
              onChange={(e) => handleChange('frequency_penalty', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 disabled:opacity-50"
              aria-label="Frequency penalty"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Reduces repetition of token sequences
            </p>
          </div>

          {/* Presence Penalty */}
          <div>
            <label className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Presence Penalty
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {localConfig.presence_penalty?.toFixed(2) || '0.00'}
              </span>
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.01"
              value={localConfig.presence_penalty || 0}
              onChange={(e) => handleChange('presence_penalty', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500 disabled:opacity-50"
              aria-label="Presence penalty"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Encourages talking about new topics
            </p>
          </div>

          {/* Stop Sequences */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Stop Sequences
            </label>
            <div className="space-y-2">
              {(localConfig.stop || []).map((seq, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={seq}
                    onChange={(e) => handleStopSequenceChange(index, e.target.value)}
                    placeholder="Enter stop sequence"
                    disabled={disabled}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    aria-label={`Stop sequence ${index + 1}`}
                  />
                  <button
                    onClick={() => handleStopSequenceRemove(index)}
                    disabled={disabled}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Remove stop sequence ${index + 1}`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={handleStopSequenceAdd}
                disabled={disabled}
                className="w-full px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                + Add Stop Sequence
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sequences where the API will stop generating further tokens
            </p>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetToDefaults}
            disabled={disabled}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
};
