# `jector`

A light-wight dependency-injection framework with (to-be) support for lazy loading.

## Inspiration

I couldn't find a simple and unintrusive DI framework that I could slap on top of my existing class defintions. Inversify has very powerful but very verbose coupling. I want auto-wiring. Additionally, no DI framework I tried had great support for scoped containers. I feel that a "module" system encompases this usecase quite well, and provides a great point for lazy loading. 

I drew a lot of inspiration from the many great DI frameworks out there like those bundled with Angular, and NestJS. I mainly envision this DI framework on a backend or desktop application.

## Features / Goals

 - [x] Value, factory, class, and "use-existing" provider types.
 - [x] Root providers
 - [x] Singleton injectable classes with `@Injectable(...)`
 - [x] Singleton scoped provision with `@Injectable()` and declaring in a `@Module({ providers: [SomeInjectableClass] })` 
 - [x] Tokens and `Inject` helpers for representing non-reflactable items
 - [x] Modules for scoping dependencies
 - [] Modules importing modules
 - [] Lazy loading modules with elegant API
 - [x] Form a "composition root" with bootstrapping a module (good read [here](https://blog.ploeh.dk/2011/07/28/CompositionRoot/))
 - [x] Inheritance of Modules via imports

## Usage

- You can define any class as a module with the `@Module()` decorator.
- Modules can declare providers scoped to them.
- You can declare injectable classes as providers with `@Injectable`
- You can declare tokens to wire up non-reflectable items in the injection system

```typescript

export const MY_DB_ADDRESS = new InjectionToken<string>("Database Address");

export function provideMyDatabaseAddress() {
  return {
    provide: MY_DB_ADDRESS,
    useValue: "localhost:1234",
  } satisfies ValueProvider;
}

@Injectable()
export class MyDatabaseService {

  constructor(@Inject(MY_DB_ADDRESS) private readonly dbAddress) {}

  async query(...args: unknown[]): Promise<unknown> {
    // Imagine database query code here.
  }

}

@Injectable()
export class AppController {

  constructor() {

  }

  initializeWindows() {
    // ....
  }

}

@Module({
  providers: [
    // Your module-scoped providers go here.
    MyDatabaseService,
    AppController,
    provideMyDatabaseAddress()
  ]
})
export class MyApplicationEntryModule {

  constructor(
    private readonly database: MyDatabaseService,
    private readonly controller: AppController
  ) {}

  // Put whatever functions you want on your module. 

  async initialize() {
    const operationAllowed = await this.database.query("op-allowed");

    if(operationAllowed) {
      this.controller.initializeWindows();
    }
  }

}
```

Then you can bootstrap that module

```typescript

// You can supply root providers here 

const moduleRef = bootstrapModule(MyApplicationEntryModule);
moduleRef.instance.initialize().catch((e) => {
  // Uh oh
})

```

## Injection philosphy

You should not be injecting concrete implementations like in the simple example above. To correctly rely on abstractions, and simultaneously avoid the verbosity of wiring that Inversify presents, you'll need to rely on `abstract class` definitions. Abstract classes in TypeScript are reflectable. 

In your individual units of code (injectable classes and provider factories) you should use these abstract definitions. Elsewhere you should define which concrete implementation (that extends the abstract class) is provided to fill in for the abstract class. 

This of course means that you can not have a single class that fufills multiple abstract providers. That would probably violate the Single Responsibility Principle anyways. 

```typescript
@Injectable()
export abstract class DatabaseService {

  abstract query(...args: unknown[]): Promise<unknown> | unknown;

}

@Injectable()
export abstract class MetricsService {

  abstract collectMetrics(): Promise<void>;

}

export class GoogleMetricsService extends MetricsService {

  constructor(private readonly dbService: DatabaseService) {
    super();
  }

  async collectMetrics() {
    const metrics = {}// Do your metric collection

    await this.dbService.query("save", metrics);
  }

}

export class AwsDatabaseService extends DatabaseService {

  constructor(
    @Inject(MY_DB_ADDRESS) private readonly dbAddress: string
  ) {

  }

  async query(...args: unknown[]) {
    // Some specific query code
  }

}

@Module({
  providers: [
    {
      provide: MetricsService,
      useClass: GoogleMetricsService
    },
    {
      provide: DatabaseService,
      useClass: AwsDatabaseService,
    }
    provideMyDatabaseAddress(),
  ]
})
export class DataModule {

}

```