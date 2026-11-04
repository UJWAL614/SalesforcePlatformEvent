import { LightningElement , wire} from 'lwc';


import getServiceRequests
    from '@salesforce/apex/ServiceRequestController.getServiceRequests';

export default class ServiceRequestList extends LightningElement {
    @wire(getServiceRequests)
    serviceRequests;

}