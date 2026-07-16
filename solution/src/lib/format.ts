const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatMoney = (value: number): string => usd.format(value);

export const formatDate = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export const formatStatus = (status: string): string => status.replace('_', ' ');
