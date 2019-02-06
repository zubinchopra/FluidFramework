import { IUser } from "@prague/container-definitions";
import { IAlfredTenant, IDocumentStorage, ITenantManager } from "@prague/services-core";
import { Router } from "express";
import { Provider } from "nconf";
import { getConfig, getToken } from "../utils";
import { defaultPartials } from "./partials";

export function create(
    config: Provider,
    tenantManager: ITenantManager,
    storage: IDocumentStorage,
    appTenants: IAlfredTenant[],
    ensureLoggedIn: any): Router {

    const router: Router = Router();

    /**
     * Loading of a specific shared text.
     */
    router.get("/:tenantId/*", ensureLoggedIn(), async (request, response, next) => {
        const rawPath =  request.params[0] as string;
        const slash = rawPath.indexOf("/");
        const documentId = rawPath.substring(0, slash !== -1 ? slash : rawPath.length);
        const path = rawPath.substring(slash !== -1 ? slash + 1 : rawPath.length);

        const tenantId = request.params.tenantId;
        const chaincode = request.query.chaincode;

        const from = Number.parseInt(request.query.from, 10);
        const to = Number.parseInt(request.query.to, 10);
        const unitIsTime = request.query.unit === "time";

        const user: IUser = (request.user) ? {
            id: request.user.name,
            name: request.user.name,
            oid: request.user.oid,
        } : undefined;

        const token = getToken(tenantId, documentId, appTenants, user);

        const workerConfigP = getConfig(
            config.get("worker"),
            tenantManager,
            tenantId,
            config.get("error:track"),
            config.get("client"));

        const versionP = storage.getLatestVersion(tenantId, documentId);
        Promise.all([workerConfigP, versionP]).then(([workerConfig, version]) => {
            response.render(
                "containerLoader",
                {
                    chaincode,
                    config: workerConfig,
                    documentId,
                    from,
                    partials: defaultPartials,
                    path,
                    tenantId,
                    title: documentId,
                    to,
                    token,
                    unitIsTime,
                    version: JSON.stringify(version),
                });
            }, (error) => {
                response.status(400).json(error);
        });
    });

    return router;
}
