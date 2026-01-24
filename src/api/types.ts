export interface UserConfig {
  userId: string;
  email: string;
  name: string;
  picture: string;
  providers: ProviderConfig[];
  settings: {
    defaultUploadTargets: string[];
    theme: 'light' | 'dark' | 'system';
    quotaAlertThreshold: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'r2_worker';
  workerUrl: string;
  authToken: string;
  isActive: boolean;
  addedAt: number;
}

// Old FileEntry (per provider) - keeping for backward compatibility
export interface FileEntry {
  key: string;
  name: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
  providerId: string;
}

// New FileMetadata (unified view) - file exists across multiple providers
export interface FileMetadata {
  key: string;
  name: string;
  size: number;
  isDirectory: boolean;
  providers: string[];  // provider IDs that have this file
  createdAt: number;
  updatedAt: number;
}

// Extended File type with relative path for folder uploads
export interface FileWithPath extends File {
  relativePath?: string;
}

export interface UploadTask {
  id: string;
  localPath: string;
  remotePath: string;
  targetProviders: string[];
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  progress: Record<string, number>;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    name: string;
    picture: string;
  };
}

export interface StorageStats {
  used: number;
  limit: number;
  fileCount: number;
}

export interface ShareLink {
  shareUrl: string;
  shareId: string;
  expiresAt?: number;
  downloadLimit?: number;
}
