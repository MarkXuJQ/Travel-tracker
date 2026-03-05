<script lang="ts">
  import LeafletMap from '$lib/components/LeafletMap.svelte';
  import JourneyPanel from '$lib/components/JourneyPanel.svelte';

  let isPanelOpen = false;
</script>

<div class="w-full h-full relative overflow-hidden">
  <LeafletMap />
  
  <div class="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur p-4 rounded-xl shadow-2xl max-w-sm border border-white/20">
    <h1 class="text-2xl font-black text-gray-800 tracking-tight">Travel Tracker</h1>
    <p class="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Explore the world in 2D and 3D.</p>
    
    <button 
      class="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-md shadow-blue-200"
      on:click={() => (isPanelOpen = !isPanelOpen)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      我的旅行足迹
    </button>
  </div>

  <JourneyPanel bind:isOpen={isPanelOpen} />
</div>

