import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GitlabConfigItemComponent } from './gitlab-config-item.component';

describe('GitlabConfigItemComponent', () => {
  let component: GitlabConfigItemComponent;
  let fixture: ComponentFixture<GitlabConfigItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GitlabConfigItemComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GitlabConfigItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
