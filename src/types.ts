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

export interface PromptSelection {
  id: string;
  title: string;
  description: string;
  tags: string[];
  permalink: string;
}

export interface DailyContent {
  date: string;
  category?: ScheduleCategory;
  prompt: PromptSelection;
  image: {
    localPath: string;
    publicUrl: string;
    bytes: Buffer;
    mimeType: string;
    geminiPrompt: string;
  };
}

export interface InstagramDraft {
  date: string;
  headline: string;
  category?: ScheduleCategory;
  prompt: PromptSelection;
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

export interface TwitterDraft {
  date: string;
  headline: string;
  category?: ScheduleCategory;
  prompt: PromptSelection;
  image: {
    localPath: string;
    publicUrl: string;
    mimeType: string;
    geminiPrompt: string;
  };
  twitter: {
    text: string;
    reply: {
      hashtags: string;
      replyTweetId?: string;
    };
  };
  publish: {
    mediaId?: string;
    tweetId?: string;
    published: boolean;
  };
}

export interface TwitterTokenRecord {
  refreshToken: string;
  scope: string;
  updatedAt: string;
}
