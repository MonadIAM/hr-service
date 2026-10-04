declare namespace Repositories.Position {
    interface Contract extends Repositories.Base.Contract<Entities.Position, Repositories.Mappers.Position.Types> {
        getLookupList: GetLookupList.Signature;
    }

    interface QueryContract extends Pick<Contract, "getLookupList" | "findUniqueOrThrow" | "findMany"> {}

    namespace GetLookupList {
        type Props = {
            organization: string;
            pagination: Pagination;
            realm: string;
            term: string;
        };

        type Item = Pick<Entities.Position, "id" | "code" | "title">;

        type Result = Promise<[Item[], number]>;

        type Signature = (props: Props) => Result;
    }
}
