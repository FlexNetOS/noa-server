#!/bin/bash
# Batch fix unused variables by prefixing with underscore

cd /home/deflex/noa-server/packages/ui

# Fix specific files with unused variables/parameters
# Charts
sed -i 's/enableZoom,/_enableZoom,/g' src/components/charts/AreaChart.tsx
sed -i "s/import { Cell,/import {/g" src/components/charts/BarChart.tsx
sed -i 's/width,/_width,/g' src/components/charts/HeatmapChart.tsx
sed -i 's/(event) =>/(\_event) =>/g' src/components/charts/HeatmapChart.tsx
sed -i 's/enableZoom,/_enableZoom,/g' src/components/charts/LineChart.tsx
sed -i 's/(entry, index)/(\_entry, index)/g' src/components/charts/PieChart.tsx
sed -i 's/showRegressionLine,/_showRegressionLine,/g' src/components/charts/ScatterChart.tsx
sed -i "s/import React, { useState, useMemo, CSSProperties } from/import React, { useState, useMemo } from/g" src/components/charts/VirtualTable.tsx
sed -i 's/const rows =/const _rows =/g' src/components/charts/VirtualTable.tsx
sed -i 's/(_, i) =>/(\_, \_i) =>/g' src/components/charts/examples.tsx

# Chat
sed -i 's/(message) =>/(\_message) =>/g' src/components/chat/ChatDemo.tsx
sed -i 's/onSendMessage,/_onSendMessage,/g' src/components/chat/ChatInterface.tsx
sed -i 's/const CodeBlock =/const \_CodeBlock =/g' src/components/chat/MarkdownContent.tsx
sed -i 's/const messageId =/const \_messageId =/g' src/components/chat/StreamingChatDemo.tsx

# Dashboard
sed -i 's/breakpoint: string/_breakpoint: string/g' src/components/dashboard/Dashboard.tsx
sed -i 's/, allLayouts/, \_allLayouts/g' src/components/dashboard/Dashboard.tsx
sed -i "s/import { PerformanceMonitor, WorkerPool } from/import { PerformanceMonitor } from/g" src/components/dashboard/PerformanceDashboard.tsx
sed -i 's/onSettings,/_onSettings,/g' src/components/dashboard/Widget.tsx
sed -i 's/(e) => e.stopPropagation()/(\_e) => \_e.stopPropagation()/g' src/components/dashboard/Widget.tsx

# Files
sed -i 's/, UploadedFile / /g' src/components/files/FilePreview.tsx
sed -i 's/uploadFile:/_uploadFile:/g' src/components/files/FileUpload.example.tsx
sed -i 's/fileId,/_fileId,/g' src/components/files/FileUpload.example.tsx
sed -i 's/formatSpeed, formatTime/_formatSpeed, \_formatTime/g' src/components/files/UploadProgress.tsx
sed -i "s/import { X, Download, ZoomIn, ZoomOut, RotateCw } from/import { X, Download } from/g" src/components/files/previews/FilePreviewModal.tsx
sed -i 's/, file)/, \_file)/g' src/components/files/previews/MarkdownPreview.tsx
sed -i 's/, file)/, \_file)/g' src/components/files/previews/PDFPreview.tsx
sed -i 's/, file)/, \_file)/g' src/components/files/previews/TextPreview.tsx

# Examples
sed -i 's/BrowserRouter,/_BrowserRouter,/g' src/examples/routing-example.tsx
sed -i 's/const navigate =/const \_navigate =/g' src/examples/routing-example.tsx
sed -i 's/useCallback,/_useCallback,/g' src/examples/streaming-chat-example.tsx

# Hooks
sed -i 's/type DashboardLayout/type \_DashboardLayout/g' src/hooks/useDashboard.ts
sed -i 's/widgetId,/_widgetId,/g' src/hooks/useDashboard.ts
sed -i 's/const navigate =/const \_navigate =/g' src/hooks/useRouteState.ts
sed -i 's/interface ChatMessage/interface \_ChatMessage/g' src/hooks/useStreamingChat.ts

echo "Fixed unused variables"
