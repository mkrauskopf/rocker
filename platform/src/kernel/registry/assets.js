import { CANCEL } from "redux-saga";

import { warning } from "../../utils";

const CLIENT_TIMEOUT = 30 * 1000;

export class SequentialProgramEvaluator {
  static queue = [];
  static compiling = false;

  static compile(id, data) {
    return new Promise((resolve) => {
      this.queue.push({
        data,
        id,
        resolve,
      });
      this.tick();
    });
  }

  static tick() {
    /* istanbul ignore next */
    if (this.compiling) {
      return;
    }
    const item = this.queue.shift();
    if (!item) {
      this.compiling = false;
      return;
    }
    this.compiling = true;
    const sandbox = {
      __SANDBOX_SCOPE__: {},
    };
    try {
      window.__SANDBOX_SCOPE__ = sandbox.__SANDBOX_SCOPE__;
      new Function("", item.data)({});
    } catch (error) {
      warning(`module ${item.id} failed to adapt with error`, error);
      sandbox.__SANDBOX_SCOPE__.Main = () => {
        throw error;
      };
    } finally {
      delete window.__SANDBOX_SCOPE__;
    }
    item.resolve(sandbox.__SANDBOX_SCOPE__);
    this.compiling = false;
    this.tick();
    return;
  }
}

/* istanbul ignore next */
async function clientCache(id) {
  try {
    return await window.caches.open(`rocker/${id}`);
  } catch (_err) {
    return {
      async match() {
        return null;
      },
      delete() {},
      put() {},
    };
  }
}

function downloadAsset(resource) {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
  }, CLIENT_TIMEOUT);

  const fetchController = new AbortController();
  const aborter = new Promise((resolve, reject) => {
    controller.signal.onabort = function () {
      fetchController.abort();
      reject("aborted");
    };
  });

  const fetcher = new Promise((resolve, reject) => {
    async function work() {
      const etags = await clientCache("etags");
      const etagEntry = await etags.match(resource);
      /* istanbul ignore next */
      const currentEtag = etagEntry ? await etagEntry.clone().text() : null;

      const options = {
        signal: fetchController.signal,
        referrerPolicy: "no-referrer",
        cache: "no-cache",
        mode: "cors",
        credentials: "same-origin",
        headers: new Headers(),
      };

      /* istanbul ignore next */
      if (currentEtag) {
        options.headers.set("If-None-Match", currentEtag);
      }

      const response = await fetch(resource, options);
      clearTimeout(id);

      const resources = await clientCache("assets");

      /* istanbul ignore next */
      if (response.status === 304) {
        if (currentEtag) {
          const assetEntry = await resources.match(`${resource}_${currentEtag}`);
          if (assetEntry) {
            return assetEntry.clone();
          }
          resources.delete(`${resource}_${currentEtag}`);
        }
        etags.delete(resource);
        const bounced = await work();
        return bounced;
      }

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      /* istanbul ignore next */
      if (currentEtag) {
        etags.delete(resource);
        resources.delete(`${resource}_${currentEtag}`);
      }
      const latestEtag = response.headers.get("Etag");
      /* istanbul ignore next */
      if (latestEtag) {
        resources.put(`${resource}_${latestEtag}`, response.clone());
        etags.put(resource, new Response(latestEtag, { status: 200, statusText: "OK" }));
      }
      return response;
    }

    work()
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(id);
        reject(error);
      });
  });

  const request = Promise.race([aborter, fetcher]);
  request[CANCEL] = () => {
    clearTimeout(id);
    controller.abort();
  };
  return request;
}

async function downloadProgram(id, program) {
  if (!program) {
    return {};
  }
  const data = await downloadAsset(program.url);
  const content = await data.text();
  return SequentialProgramEvaluator.compile(id, content);
}

export { downloadAsset, downloadProgram };