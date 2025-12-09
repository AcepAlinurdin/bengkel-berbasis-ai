export const getTodayDate = () => new Date().toISOString().split('T')[0];

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
};