import { invoke } from '@tauri-apps/api/core';

export interface ComputeRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

export interface ComputeResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

class ComputeEngineService {
  private baseUrl = 'http://localhost:8001';
  private isRunning = false;

  async call<T = any>(request: ComputeRequest): Promise<T> {
    try {
      const response = await invoke<ComputeResponse<T>>('call_compute_engine', {
        request,
      });

      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data;
    } catch (error) {
      console.error('Compute engine error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.isRunning = response.ok;
      return response.ok;
    } catch {
      this.isRunning = false;
      return false;
    }
  }

  // ==================== DATA SOURCE OPERATIONS ====================

  async testConnection(sourceType: string, config: any, credentials?: any) {
    return this.call({
      endpoint: '/api/data/test-connection',
      method: 'POST',
      data: {
        source_type: sourceType,
        config,
        credentials
      }
    });
  }

  async extractToLocal(sourceId: number, config: any) {
    return this.call({
      endpoint: '/api/data/extract',
      method: 'POST',
      data: {
        source_id: sourceId,
        config
      }
    });
  }

  // ==================== PIPELINE OPERATIONS ====================

  async executePipeline(executionId: number, pipelineConfig: any) {
    return this.call({
      endpoint: '/api/data/execute-pipeline',
      method: 'POST',
      data: {
        execution_id: executionId,
        pipeline_config: pipelineConfig
      }
    });
  }

  // WebSocket connection for real-time logs
  connectToExecutionLogs(executionId: number, onMessage: (message: string) => void): WebSocket {
    const ws = new WebSocket(`ws://localhost:8001/api/data/ws/execution/${executionId}`);
    
    ws.onmessage = (event) => {
      onMessage(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  // ==================== DATASET OPERATIONS ====================

  async queryDataset(duckdbPath: string, sql: string, limit: number = 1000) {
    return this.call({
      endpoint: '/api/data/query-dataset',
      method: 'POST',
      data: {
        duckdb_path: duckdbPath,
        sql,
        limit
      }
    });
  }

  async profileDataset(duckdbPath: string, tableName: string) {
    return this.call({
      endpoint: '/api/data/profile-dataset',
      method: 'POST',
      data: {
        duckdb_path: duckdbPath,
        table_name: tableName
      }
    });
  }

  async exportDatasetToCSV(duckdbPath: string, tableName: string, outputPath: string) {
    return this.call({
      endpoint: '/api/data/export-csv',
      method: 'POST',
      data: {
        duckdb_path: duckdbPath,
        table_name: tableName,
        output_path: outputPath
      }
    });
  }

  // ==================== ANALYSIS OPERATIONS ====================

  async runEDA(datasetId: string, options: any) {
    return this.call({
      endpoint: '/api/analysis/eda',
      method: 'POST',
      data: { dataset_id: datasetId, options },
    });
  }

  async generateVisualization(datasetId: string, vizType: string, config: any) {
    return this.call({
      endpoint: '/api/viz/generate',
      method: 'POST',
      data: {
        dataset_id: datasetId,
        viz_type: vizType,
        config
      }
    });
  }

  // ==================== ML OPERATIONS ====================

  async trainModel(config: any) {
    return this.call({
      endpoint: '/api/ml/train',
      method: 'POST',
      data: config,
    });
  }

  async predictWithModel(modelId: string, data: any) {
    return this.call({
      endpoint: '/api/ml/predict',
      method: 'POST',
      data: {
        model_id: modelId,
        data
      }
    });
  }

  // ==================== FILE OPERATIONS ====================

  async importFile(file: File, options: any) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Note: For file uploads, we'd need different handling
    // This is a placeholder for the structure
    return this.call({
      endpoint: '/api/data/import',
      method: 'POST',
      data: { options },
    });
  }

  // ==================== STATUS ====================

  getStatus() {
    return {
      isRunning: this.isRunning,
      baseUrl: this.baseUrl
    };
  }
}

export const computeEngineService = new ComputeEngineService();