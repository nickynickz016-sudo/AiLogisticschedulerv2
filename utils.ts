export const getUAEToday = (): string => {
  // Returns YYYY-MM-DD in Asia/Dubai timezone
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Dubai', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
};

export const getUAEDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Dubai', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(date);
};
