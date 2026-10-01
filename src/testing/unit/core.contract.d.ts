import { ConfigService } from "@nestjs/config";

declare global {
    namespace Unit.Domain.Core {
        interface Transaction {
            entityManager: ORM.EntityManager;
            persist: Jest.Mock<(entity: object) => void>;
            remove: Jest.Mock;
            flush: Jest.Mock<() => Promise<void>>;
            clear: Jest.Mock;
            merge: Jest.Mock;
        }

        interface Contract extends Testing.EntityFactory.Contract {
            transaction: TransactionFactory.Signature;
            createExample: CreateExample.Signature;
            config: Config.Signature;
        }

        namespace TransactionFactory {
            type Result = Transaction;

            type Signature = () => Result;
        }

        namespace Config {
            type Props = {
                values?: Record<string, unknown>;
            };

            type Result = ConfigService;

            type Signature = (props?: Props) => Result;
        }

        namespace CreateExample {
            type Props = Partial<ORM.AnyEntity>;

            type Result = ORM.AnyEntity;

            type Signature = (props?: Props) => Result;
        }
    }
}
