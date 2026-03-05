export interface MapPlugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  
  /**
   * Called when the map is initialized
   */
  onInit?: (map: any, L: any) => void;
  
  /**
   * Called when the map is destroyed
   */
  onDestroy?: () => void;
}

export interface MapPluginManager {
  register(plugin: MapPlugin): void;
  unregister(pluginId: string): void;
  getPlugin(pluginId: string): MapPlugin | undefined;
}
