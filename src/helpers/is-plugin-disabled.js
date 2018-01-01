export function isPluginDisabled(config) {
  return config.custom && config.custom.disableNodejsIndividuallyPlugin;
}
