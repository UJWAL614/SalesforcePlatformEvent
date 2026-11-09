import { LightningElement, wire  } from 'lwc';
import { MessageContext, publish } from 'lightning/messageService';
import ServiceRequestChannel from
 '@salesforce/messageChannel/ServiceRequestChannel__c';

export default class ServiceRequestPublisher extends LightningElement {
     serviceRequestTitle = '';
     serviceRequestId = '';
    serviceRequestDescription = '';
    @wire(MessageContext)
    messageContext;

    handleTitleChange(event) {
        this.serviceRequestTitle = event.target.value;
    }

    handleIdChange(event) {
        this.serviceRequestId = event.target.value;
    }

    handleDescriptionChange(event) {
        this.serviceRequestDescription = event.target.value;
    }

    handleSubmit() {
        const message = {
            serviceRequestTitle: this.serviceRequestTitle,
            serviceRequestId: this.serviceRequestId,
            serviceRequestDescription: this.serviceRequestDescription
        };
        publish(this.messageContext, ServiceRequestChannel, message);
    }
}