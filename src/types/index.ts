export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'submitter' | 'reviewer';
  display_picture?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: 'reviewer' | 'admin';
  joined_at: Date;
}

export interface Submission {
  id: number;
  project_id: number;
  submitter_id: number;
  title: string;
  code_content: string;
  file_name?: string;
  status: 'pending' | 'in_review' | 'approved' | 'changes_requested';
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: number;
  submission_id: number;
  reviewer_id: number;
  content: string;
  line_number?: number;
  is_inline: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewHistory {
  id: number;
  submission_id: number;
  reviewer_id: number;
  action: 'approved' | 'changes_requested' | 'review_started';
  notes?: string;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: number;
  is_read: boolean;
  created_at: Date;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

