export class DateTimeService {
  /**
   * Formats a date to DD/MM/YYYY
   */
  public static formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Formats a date to DD/MM/YYYY HH:mm
   */
  public static formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    const datePart = this.formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${datePart} ${hours}:${minutes}`;
  }

  /**
   * Automatically calculates current Indian Financial Year (April 1 to March 31).
   */
  public static getCurrentFinancialYear(referenceDate: Date = new Date()): {
    start: Date;
    end: Date;
    label: string;
  } {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth(); // 0-indexed: 3 is April

    let startYear = currentYear;
    let endYear = currentYear + 1;

    // If before April, we are in the previous FY
    if (currentMonth < 3) {
      startYear = currentYear - 1;
      endYear = currentYear;
    }

    const start = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1
    const end = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31
    const label = `${startYear}-${String(endYear).slice(-2)}`;

    return { start, end, label };
  }
}

export const formatDate = (date: Date | string | null | undefined): string =>
  DateTimeService.formatDate(date);

export const formatDateTime = (date: Date | string | null | undefined): string =>
  DateTimeService.formatDateTime(date);
