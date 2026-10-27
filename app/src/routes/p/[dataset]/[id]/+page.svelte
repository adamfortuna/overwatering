<script lang="ts">
	import type { PageProps } from './$types';
	import ParcelView from '#lib/ParcelView.svelte';
	import { etoFor } from '#lib/data.ts';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.parcel.address} · Overwater.ing?</title></svelte:head>

<ParcelView ds={data.ds} eto={etoFor(data.ds)} parcel={data.parcel} regions={data.regions} imagery={data.imagery} etoKey={data.ds.eto} />
