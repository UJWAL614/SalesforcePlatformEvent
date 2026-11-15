import { LightningElement } from 'lwc';

export default class ServiceRequestParent21 extends LightningElement {
    requestName = 'Sample Request';
    requestPriority = 'High';
    handleRequestNameChange(event) {
        this.requestName = event.target.value;
    }

    handleRequestPriorityChange(event) {
        this.requestPriority = event.target.value;
    }
}