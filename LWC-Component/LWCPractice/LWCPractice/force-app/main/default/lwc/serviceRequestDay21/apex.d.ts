declare module '@salesforce/apex/ServiceRequestDay21Controller.getServiceRequests' {
    const getServiceRequests: () => Promise<any[]>;
    export default getServiceRequests;
}

declare module '@salesforce/apex/ServiceRequestDay21Controller.createServiceRequest' {
    const createServiceRequest: (params: { requestData: any }) => Promise<string>;
    export default createServiceRequest;
}

declare module '@salesforce/apex' {
    export function refreshApex(result: unknown): Promise<void>;
}
declare module 'lightning/platformShowToastEvent' {
    import { ShowToastEvent } from 'lightning/platformShowToastEvent';
    export { ShowToastEvent };
}
    