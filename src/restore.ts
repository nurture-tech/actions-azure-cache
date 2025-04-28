import * as cache from "@actions/cache";
import * as utils from "@actions/cache/lib/internal/cacheUtils";
import { extractTar, listTar } from "@actions/cache/lib/internal/tar";
import * as core from "@actions/core";
import * as path from "path";
import { State } from "./state";
import {
  findObject,
  formatSize,
  getInputAsArray,
  getInputAsBoolean,
  isGhes,
  newBlobClient,
  setCacheHitOutput,
  setCacheSizeOutput,
  saveMatchedKey,
  getInput,
  newContainerClient,
} from "./utils";

process.on("uncaughtException", (e) => core.info("warning: " + e.message));

async function restoreCache() {
  try {
    const account = core.getInput("account", { required: true });
    const container = core.getInput("container", { required: true });
    const key = core.getInput("key", { required: true });
    const useFallback = getInputAsBoolean("use-fallback");
    const paths = getInputAsArray("path");
    const restoreKeys = getInputAsArray("restore-keys");
    const useAzureCliAuth = getInputAsBoolean("use-azure-cli-auth");

    try {
      // Inputs are re-evaluted before the post action, so we want to store the original values
      core.saveState(State.PrimaryKey, key);


      const compressionMethod = await utils.getCompressionMethod();
      const cacheFileName = utils.getCacheFileName(compressionMethod);
      const archivePath = path.join(
        await utils.createTempDirectory(),
        cacheFileName
      );

      const cc = newContainerClient({
        account,
        container,
        useAzureCliAuth
      });

      const { item: obj, matchingKey } = await findObject(
        cc,
        key,
        restoreKeys,
        compressionMethod
      );
      core.debug("found cache object");
      saveMatchedKey(matchingKey);
      core.info(
        `Downloading cache from azure to ${archivePath}. account: ${account}, container: ${container}, object: ${obj.name}`
      );
      const mc = newBlobClient({
        account,
        container,
        useAzureCliAuth,
        path: obj.name
      });

      await mc.downloadToFile(archivePath);

      if (core.isDebug()) {
        await listTar(archivePath, compressionMethod);
      }

      core.info(`Cache Size: ${formatSize(obj.properties.contentLength)} (${obj.properties.contentLength} bytes)`);

      await extractTar(archivePath, compressionMethod);
      setCacheHitOutput(matchingKey === key);
      setCacheSizeOutput(obj.properties.contentLength ?? 0)
      core.info("Cache restored from azure successfully");
    } catch (e) {
      core.info("Restore azure cache failed: " + e.message);
      setCacheHitOutput(false);
      if (useFallback) {
        if (isGhes()) {
          core.warning("Cache fallback is not supported on Github Enterpise.");
        } else {
          core.info("Restore cache using fallback cache");
          const fallbackMatchingKey = await cache.restoreCache(
            paths,
            key,
            restoreKeys
          );
          if (fallbackMatchingKey) {
            setCacheHitOutput(fallbackMatchingKey === key);
            core.info("Fallback cache restored successfully");
          } else {
            core.info("Fallback cache restore failed");
          }
        }
      }
    }
  } catch (e) {
    core.setFailed(e.message);
  }
}

restoreCache();
