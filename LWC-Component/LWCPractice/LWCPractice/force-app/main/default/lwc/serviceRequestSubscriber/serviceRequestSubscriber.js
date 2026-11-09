import { LightningElement , wire} from 'lwc';

import { MessageContext, subscribe, unsubscribe} from
'lightning/messageService';
import ServiceRequestChannel
 from '@salesforce/messageChannel/ServiceRequestChannel__c';
export default class ServiceRequestSubscriber extends LightningElement {
    serviceRequestTitle = '';
    serviceRequestId = '';
    serviceRequestDescription = '';

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscription = subscribe(this.messageContext, ServiceRequestChannel, (message) => {
            this.serviceRequestTitle = message.serviceRequestTitle;
            this.serviceRequestId = message.serviceRequestId;
            this.serviceRequestDescription = message.serviceRequestDescription;
        }
        // ,
        //     { scope: APPLICATION_SCOPE }
        );
    }

    disconnectedCallback() {
       if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
    }
}