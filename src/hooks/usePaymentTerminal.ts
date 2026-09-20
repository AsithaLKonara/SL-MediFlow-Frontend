import { useState } from 'react';

export function usePaymentTerminal() {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Pushes the payment to the connected card machine (POS Terminal).
   * Note: This is currently a mock. Depending on the terminal (e.g. Stripe Terminal, Verifone, Ingenico),
   * this would communicate via a local WebSocket/TCP connection or a cloud API.
   * 
   * @param amount The total amount to charge
   * @returns boolean true if payment succeeded, false if failed/cancelled
   */
  const initiateCardPayment = async (amount: number): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      const posIp = process.env.NEXT_PUBLIC_POS_IP;
      
      if (!posIp) {
        console.warn("NEXT_PUBLIC_POS_IP not set. Falling back to mock payment.");
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      }

      console.log(`Pushing LKR ${amount} to DFCC Android POS Terminal at ${posIp}...`);
      
      const response = await fetch(`http://${posIp}:8080/api/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          currency: "LKR",
          transactionType: "SALE",
          referenceId: `TXN-${Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`POS returned ${response.status}`);
      }

      const result = await response.json();
      
      // Typical POS response check (e.g., success flag or code)
      return result.success === true || result.responseCode === "00";

    } catch (error) {
      console.error("Payment terminal error:", error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return { initiateCardPayment, isProcessing };
}
