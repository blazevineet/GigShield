// backend/src/utils/mlGateway.ts
import axios from 'axios';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export interface MLPremiumResponse {
  base_premium: number;
  final_premium: number;
  risk_score: number;
  multiplier: number;
  coverage_hours: number;
  explanation: string;
}

export const mlGateway = {
  getPremiumQuote: async (data: {
    zone: string;
    tier: string;
    avg_hours: number;
    tenure_months: number;
    is_monsoon: boolean;
  }): Promise<MLPremiumResponse> => {
    try {
      const response = await axios.post(`${ML_URL}/premium/predict`, data);
      return response.data;
    } catch (error) {
      console.error('ML Service Error:', error);
      // Fallback to base prices if ML service is down (Safety for demo)
      return {
        base_premium: 49,
        final_premium: 49,
        risk_score: 0.5,
        multiplier: 1.0,
        coverage_hours: 8,
        explanation: "Fallback applied - ML service unreachable."
      };
    }
  }
};