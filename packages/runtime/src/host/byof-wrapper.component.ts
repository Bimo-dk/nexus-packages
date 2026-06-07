import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

/**
 * Generic "Bring Your Own Framework" wrapper. Renders a host-owned div
 * and hands it to the federated remote's `mount(el)` function. The
 * remote is responsible for standing up its own framework runtime
 * inside the div and returning a teardown function.
 *
 * Used by `DynamicNexusService` for remotes that export `mount(el)`
 * — typically Vue, React, or vanilla remotes loaded by an Angular host.
 * Angular-native remotes that expose an Angular component class are
 * loaded directly via the router's `loadComponent` and never see this
 * wrapper.
 *
 * The mount-fn input is set imperatively by the service that created
 * this component; it is not bound from a template.
 */
@Component({
  selector: 'nexus-byof-wrapper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #root></div>`,
  styles: [':host{display:block;}'],
})
export class NexusByofWrapperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true })
  rootEl!: ElementRef<HTMLDivElement>;

  @Input()
  mountFn?: (el: HTMLElement) => void | (() => void);

  private teardown?: () => void;

  ngAfterViewInit(): void {
    if (this.mountFn) {
      const result = this.mountFn(this.rootEl.nativeElement);
      if (typeof result === 'function') this.teardown = result;
    }
  }

  ngOnDestroy(): void {
    this.teardown?.();
  }
}
