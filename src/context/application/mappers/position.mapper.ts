export class PositionMapper implements Commands.Mappers.Position.Contract {
    public confirmed(props: Commands.Mappers.Position.Confirmed.Props): Commands.Mappers.Position.Confirmed.Result {
        return props.request;
    }

    public rejected(props: Commands.Mappers.Position.Rejected.Props): Commands.Mappers.Position.Rejected.Result {
        return {
            ...props.request,
            input: {
                ...props.request.input,
                reason: props.reason,
            },
        };
    }

    public placementPayload(
        props: Commands.Mappers.Position.PlacementPayload.Props,
    ): Commands.Mappers.Position.PlacementPayload.Result {
        const { position, actor, realm } = props;
        return {
            actor,
            realm,
            input: {
                organization: position.organization.id,
                department: position.department,
                process: position.process!,
                position: position.id,
                team: position.team,
            },
        };
    }

    public lifecyclePayload(
        props: Commands.Mappers.Position.LifecyclePayload.Props,
    ): Commands.Mappers.Position.LifecyclePayload.Result {
        return {
            actor: props.actor,
            realm: props.realm,
            input: {
                positions: props.positions.map(({ id }) => id),
                organization: props.organization,
            },
        };
    }
}
