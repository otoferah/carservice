export type AppRole="admin"|"supervisor"|"usta"|"customer";
export type ServiceStatus="quote"|"waiting"|"repairing"|"testing"|"ready"|"delivered"|"cancelled";
export const statusLabels:Record<ServiceStatus,string>={
 quote:"Teklif oluşturuldu",waiting:"Araç beklemede",repairing:"Onarım aşamasında",
 testing:"Test aşamasında",ready:"Araç hazır",delivered:"Teslim edildi",cancelled:"İptal edildi"
};
