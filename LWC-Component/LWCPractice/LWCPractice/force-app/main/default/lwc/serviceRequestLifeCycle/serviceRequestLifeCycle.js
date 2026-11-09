import { LightningElement } from 'lwc';

export default class ServiceRequestLifeCycle extends LightningElement {

message = 'loading...';
hasRender = false;
connectedCallback() {
    console.log('connectedCallback called');
    this.message = 'connectedCallback called';
}

renderedCallback() {
    if (this.hasRender) {
        return;
    }
    this.hasRender = true;
    console.log('renderedCallback called');
    this.message = 'renderedCallback called';
}

disconnectedCallback() {
    console.log('disconnectedCallback called');
    this.message = 'disconnectedCallback called';
}

}
