export interface PromptRecord {
  id: string;
  title: string;
  content: string;
  tags: string[];
  explanation: string | null;
  suggested_model: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type ScheduleCategory =
  | 'career_cv'
  | 'productivity'
  | 'social_content'
  | 'business_email'
  | 'fun_creative';

export interface InstagramDraft {
  date: string;
  headline: string;
  category?: ScheduleCategory;
  prompt: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    permalink: string;
  };
  image: {
    localPath: string;
    publicUrl: string;
    mimeType: string;
    geminiPrompt: string;
  };
  instagram: {
    caption: string;
    comment?: {
      hashtags: string;
      commentId?: string;
    };
  };
  publish: {
    containerId?: string;
    mediaId?: string;
    published: boolean;
  };
}
