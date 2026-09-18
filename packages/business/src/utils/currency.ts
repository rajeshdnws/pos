export class CurrencyService {
  private static defaultCurrency = 'INR';
  private static defaultSymbol = '₹';

  /**
   * Formats a numeric amount using the Indian numbering system (e.g. ₹1,50,000.00).
   */
  public static format(amount: number, symbol: string = this.defaultSymbol): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return `${symbol}0.00`;
    }

    const formattedNumber = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${symbol}${formattedNumber}`;
  }

  public static getDefaultCurrency(): string {
    return this.defaultCurrency;
  }

  public static getDefaultSymbol(): string {
    return this.defaultSymbol;
  }
}
