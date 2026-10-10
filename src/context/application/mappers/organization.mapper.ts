import { PlatformService, RealmType } from "~context/enums";

export class OrganizationMapper implements Commands.Mappers.Organization.Contract {
    public confirmed(props: Commands.Mappers.Organization.Confirmed.Props): Commands.Mappers.Organization.Confirmed.Result {
        const { actor, realm, input } = props.request;
        return {
            actor,
            realm,
            input: {
                service: PlatformService.HR_SERVICE,
                type: RealmType.ORGANIZATION,
                resource: input.resource,
                process: input.process,
            },
        };
    }

    public rejected(props: Commands.Mappers.Organization.Rejected.Props): Commands.Mappers.Organization.Rejected.Result {
        const { actor, realm, input } = props.request;
        return {
            actor,
            realm,
            input: {
                type: RealmType.ORGANIZATION,
                resource: input.resource,
                process: input.process,
                reason: props.reason,
            },
        };
    }
}
