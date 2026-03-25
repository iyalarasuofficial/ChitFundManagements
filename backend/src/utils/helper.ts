// utils/helpers.ts

export const calculateArrears = (currentCycle: number, contributionAmount: number): number => {
    return (currentCycle - 1) * contributionAmount;
  };
  
  export const calculatePenalty = (amountDue: number, daysLate: number): number => {
    return amountDue * 0.02 * (daysLate / 30); // 2% per month prorated
  };
  
  export const adjustDueWithDividend = (amountDue: number, dividendCredit: number): number => {
    return Math.max(0, amountDue - dividendCredit);
  };
  
  // Mock ML risk score (replace with Flask call later)
  export const calculateRisk = (member: any): number => {
    return member.arrearsAmount > 0 ? 80 : member.dividendCredit > 0 ? 20 : 50; // Simple logic
  };