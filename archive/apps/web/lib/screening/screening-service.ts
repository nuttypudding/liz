import { createServerSupabaseClient } from '../supabase/server';
import { analyzeApplicationWithAI } from './ai-analysis';
import {
  ApplicationStatus,
  ScreeningProvider,
  AIScreeningAnalysis,
} from './types';

/**
 * Create screening report from AI analysis.
 * Fetches the application, runs AI analysis, stores the report,
 * and updates application status to 'screened'.
 */
export async function createScreeningReport(
  applicationId: string,
  backgroundCheckResults?: Record<string, unknown>,
  creditScoreRange?: string
) {
  const supabase = createServerSupabaseClient();

  try {
    // Get full application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    // Get landlord preferences for income ratio
    const { data: landlord } = await supabase
      .from('landlord_profiles')
      .select('min_income_ratio')
      .eq('id', application.landlord_id)
      .single();

    // Run AI analysis
    const aiResult = await analyzeApplicationWithAI(
      application,
      creditScoreRange,
      landlord?.min_income_ratio
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI analysis failed');
    }

    const riskScore = calculateOverallRiskScore(aiResult.analysis!);

    // Create screening report
    const { data: report, error: insertError } = await supabase
      .from('screening_reports')
      .insert([
        {
          application_id: applicationId,
          provider: ScreeningProvider.CLAUDE_AI,
          status: 'completed',
          credit_score_range: creditScoreRange,
          background_result: backgroundCheckResults,
          ai_analysis: aiResult.analysis,
          risk_score: riskScore,
          recommendation: aiResult.analysis?.recommendation,
          prompt_snapshot: aiResult.complianceSnapshot,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `Failed to create screening report: ${insertError.message}`
      );
    }

    // Update application status and risk_score
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: ApplicationStatus.SCREENED,
        risk_score: report.risk_score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application:', updateError);
    }

    return { success: true, report };
  } catch (error) {
    console.error('Screening report creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate overall risk score from AI analysis factors.
 */
function calculateOverallRiskScore(analysis: AIScreeningAnalysis): number {
  if (analysis.risk_factors.length > 0) {
    let total = 0;
    let count = 0;

    analysis.risk_factors.forEach((factor) => {
      const signalScore =
        factor.signal === 'concerning'
          ? 75
          : factor.signal === 'positive'
            ? 25
            : 50;
      const weight =
        factor.weight === 'high' ? 1.5 : factor.weight === 'low' ? 0.5 : 1;
      total += signalScore * weight;
      count += weight;
    });

    return Math.round(total / count);
  }

  return 50;
}
