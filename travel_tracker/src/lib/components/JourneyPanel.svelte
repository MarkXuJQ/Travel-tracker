<script lang="ts">
  import { journeyStore, addJourney, deleteJourney, exportJourneys } from '$lib/utils/journeyStore';
  import { slide, fade } from 'svelte/transition';
  import type { Journey } from '$lib/data/travelConfig';

  export let isOpen = false;

  let newJourney: Omit<Journey, 'id'> = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    coordinates: undefined
  };

  let showForm = false;

  function handleSubmit() {
    if (newJourney.title && newJourney.location) {
      addJourney(newJourney);
      newJourney = {
        title: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        description: '',
        coordinates: undefined
      };
      showForm = false;
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[2000] flex flex-col border-l border-gray-200"
    transition:slide={{ axis: 'x', duration: 300 }}
  >
    <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
      <h2 class="text-xl font-bold text-gray-800">我的旅程</h2>
      <button 
        class="text-gray-400 hover:text-gray-600 p-1"
        on:click={() => (isOpen = false)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      {#if showForm}
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3" transition:fade>
          <input 
            type="text" 
            placeholder="旅程标题" 
            class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            bind:value={newJourney.title}
          />
          <input 
            type="date" 
            class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            bind:value={newJourney.date}
          />
          <input 
            type="text" 
            placeholder="地点 (如：成都)" 
            class="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            bind:value={newJourney.location}
          />
          <textarea 
            placeholder="简单描述一下..." 
            class="w-full p-2 border rounded text-sm h-20 focus:ring-2 focus:ring-blue-400 outline-none resize-none"
            bind:value={newJourney.description}
          ></textarea>
          <div class="flex gap-2">
            <button 
              class="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
              on:click={handleSubmit}
            >
              保存
            </button>
            <button 
              class="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-300"
              on:click={() => (showForm = false)}
            >
              取消
            </button>
          </div>
        </div>
      {:else}
        <button 
          class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          on:click={() => (showForm = true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加新旅程
        </button>
      {/if}

      <div class="space-y-3 mt-6">
        {#each $journeyStore as journey (journey.id)}
          <div class="p-3 border rounded-lg hover:shadow-md transition-shadow relative group">
            <button 
              class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              on:click={() => deleteJourney(journey.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <h3 class="font-bold text-gray-800 pr-6">{journey.title}</h3>
            <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span class="bg-gray-100 px-2 py-0.5 rounded">{journey.date}</span>
              <span>@{journey.location}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2 line-clamp-2">{journey.description}</p>
          </div>
        {:else}
          <p class="text-center text-gray-400 text-sm py-10">还没有旅程记录，开始添加吧！</p>
        {/each}
      </div>
    </div>

    <div class="p-4 border-t border-gray-100 bg-gray-50">
      <button 
        class="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors text-sm"
        on:click={exportJourneys}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        导出为 JSON 文件
      </button>
      <p class="text-[10px] text-gray-400 mt-2 text-center">
        导出的文件可手动更新至 travelConfig.ts 以永久保存。
      </p>
    </div>
  </div>
{/if}
