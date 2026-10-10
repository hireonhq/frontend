import axiosInstance from "@/lib/api/axiosInstance";
export interface CVSectionAnalysis {
  score: number;
  comment: string;
}
export interface CVAnalysisResult {
  overall_score: number;
  score_breakdown: {
    technical_skills: number;
    experience_relevance: number;
    education: number;
    achievement: number;
  };
  cv_strengths: string[];
  areas_for_improvement: string[];
  section_analysis: {
    work_experience: CVSectionAnalysis;
    education: CVSectionAnalysis;
    skills: CVSectionAnalysis;
    achievements: CVSectionAnalysis;
  };
  processing_time_seconds: number;
  model: string;
}

/**
 * Routed through the backend: the ML service API key must never reach the
 * browser, where every NEXT_PUBLIC_* value is inlined into the JS bundle.
 */
export async function analyzeCVApi(file: File): Promise<CVAnalysisResult> {
  const formData = new FormData();
  formData.append("cv", file);

  const res = await axiosInstance.post("/profile/cv-analysis", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.data;
}
