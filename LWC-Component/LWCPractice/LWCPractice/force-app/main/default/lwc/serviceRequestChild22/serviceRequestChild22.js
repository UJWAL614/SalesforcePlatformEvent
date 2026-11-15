import { LightningElement, api, track } from 'lwc';

export default class ServiceRequestChild22 extends LightningElement {
    _priority;
    _name;
    priorityMessage = 'Normal processing';

    @track requestDetails = {
        name: this._name,
        priority: this._priority
    };

    // ---------- requestName getter/setter ----------
    @api
    get requestName() {
        return this._name;
    }
    set requestName(value) {
        this._name = value;
        this.requestDetails.name = value;
    }

    // ---------- requestPriority getter/setter ----------
    @api
    get requestPriority() {
        return this._priority;
    }
    set requestPriority(value) {
        this._priority = value;
        this.requestDetails.priority = value;

        this.priorityMessage =
            value === 'Critical' ? 'Urgent attention required!' : 'Normal processing';
    }

    // ---------- Button click: change value only in the child ----------
    changedRequestDetails() {
        this.requestPriority = 'Critical';   // calls the setter above
    }
}