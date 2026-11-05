import {lightningElement, api, wire} from 'lwc';

export default class ServiceRequestForm extends lightningElement {
    @api parentMessage;

    requestName = '';
    externalSystemId = '';
    accountId;
    subject = '';
    priority = 'Medium';
    status = 'New';
    description = '';
    emailAddress = '';

     priorityOptions = [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
        { label: 'High', value: 'High' },
        { label: 'Critical', value: 'Critical' }
    ];

    statusOptions = [
        { label: 'New', value: 'New' },
        { label: 'Assigned', value: 'Assigned' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Waiting', value: 'Waiting' },
        { label: 'Resolved', value: 'Resolved' },
        { label: 'Closed', value: 'Closed' }
    ];

    handleInputChange(event) {
          this[event.target.dataset.field] =
            event.target.value;

        this.sendDataToParent();
    }

    handlePickelistChange(event) {
        this[event.target.dataset.field] = event.detail.value;
        this.sendDataToParent();
    }
      handleAccountChange(event) {
        this.accountId = event.detail.recordId;

        this.sendDataToParent();
    }
      sendDataToParent() {
        const formData  = {
            requestName: this.requestName,
            externalSystemId: this.externalSystemId,    
            accountId: this.accountId,
            subject: this.subject,
            priority: this.priority,
            status: this.status,
            description: this.description,
            emailAddress: this.emailAddress
        };
         this.dispatchEvent(
            new CustomEvent('formchange', {
                detail: formData
            })
        );
      
      }
       handleSubmit(){
        this.sendDataToParent();
       }
}