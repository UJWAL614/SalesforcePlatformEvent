import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import service_request_object from '@salesforce/schema/Service_Request__c';
import service_request_name from '@salesforce/schema/Service_Request__c.Name';
import service_request_description from '@salesforce/schema/Service_Request__c.Description__c';
import service_request_status from '@salesforce/schema/Service_Request__c.Status__c';
import service_request_priority from '@salesforce/schema/Service_Request__c.Priority__c';
import service_request_email from '@salesforce/schema/Service_Request__c.Email_Address__c';
import service_request_close_date from '@salesforce/schema/Service_Request__c.Closed_Date__c';
import account_id from '@salesforce/schema/Service_Request__c.Account__c';
import external_id from '@salesforce/schema/Service_Request__c.External_System_ID__c';
import service_request_category from '@salesforce/schema/Service_Request__c.category__c';


export default class ServiceRequestFormDay23 extends LightningElement {
objectApiName = service_request_object;
fields = 
[service_request_name, 
    service_request_description,
     service_request_status, 
     service_request_priority, 
     service_request_email, 
     service_request_close_date, 
     account_id, external_id, 
     service_request_category];

     onSuccess(event) {
        const toastEvent = new ShowToastEvent({
            title: "Success",
            message: "Service Request created successfully :" + event.detail.id,
            variant: "success"
        });
        this.dispatchEvent(toastEvent);
    }
    onError(event) {
        const toastEvent = new ShowToastEvent({
            title: "Error",
            message: "Error creating Service Request",
            variant: "error"
        });
        this.dispatchEvent(toastEvent);
    }
    
}