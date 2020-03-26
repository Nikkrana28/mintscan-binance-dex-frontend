import React from "react";
import axios from "axios";
import {_, empty} from "src/lib/scripts";

import reducer, {INIT, FETCHING_ALL, FETCHING_SELECTIVE, SUCCESS, initialState, FINISHED, ERROR} from "./reducer";

//  hooks
import {usePrevious} from "src/hooks/index";

export default function useMultiFetch(inputUrls = [], method = "get") {
	const [urls, setUrls] = React.useState(inputUrls);
	const [state, dispatch] = React.useReducer(reducer, initialState, () => initialState);
	const [fetch, setFetch] = React.useState(Array.from({length: inputUrls.length}, (v, i) => 0));
	const previousFetch = usePrevious(fetch);
	// const previousUrls = usePrevious(urls);

	// TODO
	//  initial load of each url + for setUrl
	//  change this to only initial load when refetch urls by index is finished
	React.useEffect(() => {
		//  each and every url is not empty
		if (!_.every(inputUrls, url => !empty(url))) {
			console.warn("initial fetch did not happen - account");
			return;
		}
		console.count("multiFetch");
		let unmounted = false;
		const promiseList = [];
		const sourceList = [];
		dispatch({type: FETCHING_ALL});
		_.each(inputUrls, (url, idx) => {
			const source = axios.CancelToken.source();
			sourceList.push(source);
			promiseList.push(
				new Promise((resolve, reject) => {
					axios[method](url, {cancelToken: source.token})
						.then(res => {
							if (!unmounted) {
								dispatch({type: SUCCESS, payload: {data: res.data, idx}});
								resolve();
							}
						})
						.catch(ex => {
							if (!unmounted) {
								console.warn("error during fetch", ex);
								dispatch({type: ERROR, payload: {errorMessage: ex.message}});
								resolve();
							}
						});
				})
			);
		});
		Promise.all(promiseList).finally(() => {
			// console.log("finished all calls");
			dispatch({type: FINISHED});
		});
		return () => {
			unmounted = true;
			_.each(sourceList, source => source.cancel("cancel cleanup"));
		};
	}, [inputUrls, method]);

	// TODO
	//  refetch urls by index
	//  Don't need this yet, maybe in the future
	React.useEffect(() => {
		//  do nothing if each value in fetch is the same
		if (_.isEqual(fetch, previousFetch)) return;
		console.log("attempt to refetch");
	}, [fetch, previousFetch]);

	const requestRefetch = React.useCallback(
		idx => {
			setFetch(v => v + 1);
		},
		[setFetch]
	);

	return [{...state}, requestRefetch, setUrls];
}