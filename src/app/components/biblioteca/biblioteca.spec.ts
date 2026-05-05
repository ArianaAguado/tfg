import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Biblioteca } from './biblioteca';

describe('Biblioteca', () => {
  let component: Biblioteca;
  let fixture: ComponentFixture<Biblioteca>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Biblioteca],
    }).compileComponents();

    fixture = TestBed.createComponent(Biblioteca);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
