/**
 * ImagePreview Component
 * Image viewer with zoom and pan capabilities using react-zoom-pan-pinch
 */

import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import type { FileItem } from '../../../types/fileBrowser';

export interface ImagePreviewProps {
  file: FileItem;
  content: string | null;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file, content }) => {
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState(false);

  // Generate image URL (either from content or file path)
  const imageUrl = content || (file as any).url || '';

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleImageError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600 dark:text-red-400">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg font-medium">Failed to load image</p>
        <p className="text-sm mt-2">{file.name}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => zoomOut()}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => zoomIn()}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Rotate"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Reset view"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Scroll to zoom, drag to pan
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="flex items-center justify-center w-full h-full"
              >
                <img
                  src={imageUrl}
                  alt={file.name}
                  onError={handleImageError}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease',
                  }}
                />
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default ImagePreview;
