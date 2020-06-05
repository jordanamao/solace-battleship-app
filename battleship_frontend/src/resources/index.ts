import {FrameworkConfiguration, PLATFORM} from 'aurelia-framework';


export function configure(config: FrameworkConfiguration) {
  //Load the SolaceClient connection library on startup
  config.globalResources([PLATFORM.moduleName('../common/solace-client')]);
}
